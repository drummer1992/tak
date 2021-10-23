'use strict'

const { isObject, isString, isFunction, isNil } = require('../../utils/predicates')
const { last } = require('../../utils/array')
const { and } = require('../../utils/function')
const { ValidationError, assert } = require('../../errors')

const DEFAULT_ROOT_ATTRIBUTE = 'payload'

const assertMessage = message => {
  assert(isString(message) || isFunction(message), 'message should be a string or a function')
}

const assertValidate = validate => {
  assert(isFunction(validate), 'validate should be a function')
}

const makeOptional = validate => value => {
  if (isNil(value)) {
    return true
  }

  return validate(value)
}

class Check {
  constructor(check) {
    this.message = check.message
    this.validate = check.validate
  }

  static create(check, optional, common) {
    assert(isObject(check), 'check should be type of object')

    assertMessage(check.message)
    assertValidate(check.validate)

    const validate = optional ? makeOptional(check.validate) : check.validate

    return new this({
      validate: common ? and(common.validate, validate) : validate,
      message: check.message,
    })
  }

  setMessage(message) {
    assertMessage(message)

    this.message = message
  }
}

const composeMessage = (message, path, value, key) => typeof message === 'function'
    ? message(path || DEFAULT_ROOT_ATTRIBUTE, value, key)
    : message

const performCheck = async (check, params) => {
  const { path, value, key } = params

  if (!await check.validate(value)) {
    const message = await composeMessage(check.message, path, value, key)

    return new ValidationError(message, path, value, key)
  }
}

const listKey = Symbol('list')

module.exports = class Checks {
  constructor() {
    this[listKey] = []

    /**
     * @type {Check}
     */
    this.common = undefined
  }

  add(check, { optional = true, common = false } = {}) {
    const instance = Check.create(check, optional, this.common)

    if (common) {
      assert(!this.common, 'common check is already defined')

      this.common = instance
    }

    this[listKey].push(instance)
  }

  async execute(params) {
    const errors = []

    for (const check of this.getList()) {
      const error = await performCheck(check, params)

      if (error) {
        if (!params.bulk) {
          throw error
        }

        errors.push(error)
      }
    }

    return errors
  }

  /**
   * @returns {Check[]}
   */
  getList() {
    return [...this[listKey]]
  }

  /**
   * @returns {Check}
   */
  last() {
    const check = last(this.getList())

    assert(check, 'no one check defined')

    return check
  }
}
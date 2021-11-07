import {CheckDto, Message, Validate, ValidationParams} from "../interfaces";
import {ValidationError} from "../errors";

declare class Check {
    constructor(checkDto: CheckDto)

    message: Message

    validate: Validate

    execute(params: ValidationParams): Promise<ValidationError>
}

export default Check
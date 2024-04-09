import {CError} from  "./index"

export const JWTParsingError = (msg: string) => {
    return new CError(msg, 500)
}
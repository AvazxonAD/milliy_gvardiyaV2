class ErrorResponse extends Error {
    constructor(message, statusCode){
        super(message)
        this.statuscode = statusCode
    }
}

module.exports = ErrorResponse
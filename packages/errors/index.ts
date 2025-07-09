type Status = 200 | 400 | 401 | 403 | 500 | 501;
export class CError extends Error {
    status: Status;

    constructor(message: string, status: Status) {
        super(message);
        this.status = status;
    }

    toJSON(): [object, Status] {
        return [
            {
                error: this.message,
            },
            this.status,
        ];
    }
}

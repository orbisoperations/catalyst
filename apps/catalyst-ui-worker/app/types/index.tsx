export type JWTRequest = {
    entity: string;
    claims: string[];
    expiresIn?: number;
    name?: string;
    description?: string;
};

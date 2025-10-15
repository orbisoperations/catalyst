export type JWTRequest = {
    entity: string;
    claims: string[];
    audience: string;
    expiresIn?: number;
    name?: string;
    description?: string;
};

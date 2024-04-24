export type JWTRequest = {
  entity: string;
  claims: string[];
  expiresIn?: number;
};

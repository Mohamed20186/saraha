import jwt from "jsonwebtoken";
import configService from "../../config/config.service.js";

export const createToken = ({
    payload = {},
    options = {},
    secret = configService.JWT_SECRET
}) => {
    const nbfTime = 5 * 60
    return jwt.sign(payload, secret, {
        expiresIn: 30 + nbfTime,
        notBefore: nbfTime,
        ...options
    });
};


export const verifyToken = ({
    token,
    secret = configService.JWT_SECRET
}) => {
    return jwt.verify(token, secret);
};
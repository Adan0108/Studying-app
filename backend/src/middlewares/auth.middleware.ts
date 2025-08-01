import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";

interface JwtPayload { id: string }

interface AuthedRequest extends Request {
  user?: { id: string };
}

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "1h";

export async function protect(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No access token, authorization denied" });
  }

  const accessToken = authHeader.split(" ")[1];

  try {
    // Verify access token
    const decoded = jwt.verify(accessToken, ACCESS_SECRET) as JwtPayload;
    req.user = { id: decoded.id };
    return next();

  } catch (err: any) {
    if (err instanceof TokenExpiredError) {
      // Try refresh flow
      const refreshToken = req.headers["x-refresh-token"] as string | undefined;
      if (!refreshToken) {
        return res.status(401).json({ message: "Access expired; no refresh token provided" });
      }

      try {
        const decodedRefresh = jwt.verify(refreshToken, REFRESH_SECRET) as JwtPayload;

        // Issue a new access token (cast options to any to satisfy TS)
        const newAccessToken = jwt.sign(
          { id: decodedRefresh.id },
          ACCESS_SECRET,
          ({ expiresIn: ACCESS_EXPIRES_IN } as any)
        );

        // Send it back in a header for the client to update
        res.setHeader("x-access-token", newAccessToken);
        req.user = { id: decodedRefresh.id };
        return next();

      } catch {
        return res.status(401).json({ message: "Invalid refresh token" });
      }
    }

    // Any other token error
    return res.status(401).json({ message: "Token is not valid" });
  }
}
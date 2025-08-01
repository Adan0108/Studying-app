import { sign, Secret } from "jsonwebtoken";
import { User, IUser } from "../models/user.model";

// ——————————— Config ——————————————
// Load secrets from .env, crash early if missing
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as Secret;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as Secret;

// if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
//   console.error("❌ Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in .env");
//   process.exit(1);
// }

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// —————————— Types & Payload ——————————
export interface AuthPayload {
  id: string;
}

export interface LoginResult {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}

// —————————— Service Functions ——————————

/**
 * Register a new user, hashing password via model hook.
 */
export async function registerUser(
  email: string,
  password: string
): Promise<IUser> {
  const exists = await User.findOne({ email });
  if (exists) throw new Error("User already exists");

  const user = new User({ email, passwordHash: password });
  return user.save();
}

/**
 * Validate credentials and issue access + refresh tokens.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid credentials");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error("Invalid credentials");

  // Mongoose virtual `id` is always a string
  const payload: AuthPayload = { id: user.id };

  // Sign tokens (casting options to any to satisfy TS overloads)
  const accessToken = sign(
    payload,
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as any
  );
  const refreshToken = sign(
    payload,
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as any
  );

  return {
    user: { id: user.id, email: user.email },
    accessToken,
    refreshToken,
  };
}

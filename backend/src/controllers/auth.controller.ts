import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await registerUser(email, password);
    res.status(201).json({ id: user._id, email: user.email });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export async function login(req: Request, res: Response) {

  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    return res.json(result);  // { user, accessToken, refreshToken }
  } catch (err: any) {
    return res.status(401).json({ message: err.message });
  }
}


// For stateless JWT, logout is client-side (drop token). 
export const logout = (_req: Request, res: Response) => {
  // Client should delete their stored token.
  res.json({ message: "Logged out" });
};

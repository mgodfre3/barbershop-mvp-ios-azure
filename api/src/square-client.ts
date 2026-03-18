import { SquareClient, SquareEnvironment } from "square";

const squareApiKey = process.env.SQUARE_API_KEY || "sandbox-sq0atp-CHANGE_ME";
const squareEnvironment = (process.env.NODE_ENV === "production"
  ? SquareEnvironment.Production
  : SquareEnvironment.Sandbox);

export const squareClient = new SquareClient({
  token: squareApiKey,
  environment: squareEnvironment,
});

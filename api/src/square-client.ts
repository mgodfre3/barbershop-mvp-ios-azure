import { Client, Environment } from "squareup";

const squareApiKey = process.env.SQUARE_API_KEY || "sandbox-sq0atp-CHANGE_ME";
const squareEnvironment = (process.env.NODE_ENV === "production" 
  ? Environment.Production 
  : Environment.Sandbox);

export const squareClient = new Client({
  accessToken: squareApiKey,
  environment: squareEnvironment,
});

export const { customersApi, catalogApi, ordersApi, loyaltyApi } = squareClient;

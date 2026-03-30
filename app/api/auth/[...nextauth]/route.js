// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// This file sets up NextAuth.js for authentication. It uses the authOptions defined in lib/auth.js, which includes providers and callbacks.
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

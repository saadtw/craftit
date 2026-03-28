"use client";

import { createContext } from "react";

// True means child pages are already wrapped by the persistent customer shell.
const CustomerLayoutContext = createContext(false);

export default CustomerLayoutContext;

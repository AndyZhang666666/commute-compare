"use client";
import { createContext } from 'react';
export const InputValidityContext=createContext<(id:string,dirty:boolean)=>void>(()=>{});

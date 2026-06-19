import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children}) => {
    const [user, setUser] = React.useState(() => {
        const savedUser = localStorage.getItem("gestpr_user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = (userData) => {
        localStorage.setItem("gestpr_user", JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem("gestpr_user");
        setUser(null);
    };

    return (
            <AuthContext.Provider value={{user, login, logout}}>
                {children}
            </AuthContext.Provider>
    )
};

export const useAuth = () => useContext(AuthContext);
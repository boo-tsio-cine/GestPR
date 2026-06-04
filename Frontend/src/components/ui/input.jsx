import React from "react";


const Input = React.forwardRef(
  ({ className = "", type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`input ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
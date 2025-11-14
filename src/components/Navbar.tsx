"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const [time, setTime] = useState(new Date());

  const { user } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}/${month}/${year} - Giờ hiện tại: ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div
      style={{ padding: "5px 50px" }}
      className="flex items-center justify-between mb-6 bg-white rounded-lg shadow-sm p-3"
    >
      <div className="flex items-center w-2/3">
        <p>
          Xin chào {user?.fullname || "Admin"}. Hôm nay là:{" "}
          {formatDateTime(time)}
        </p>
      </div>
    </div>
  );
};

export default Navbar;

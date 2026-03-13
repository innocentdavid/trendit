"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { AuthUser } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { FeedsClient } from "@stream-io/feeds-client";

interface AuthContextType {
  user: AuthUser | null;
  client: FeedsClient | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [client, setClient] = useState<FeedsClient | null>(null)
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setUser(null);
          setLoading(false);
          redirect('/auth/login');
        }
        try {
          if (!user.user_metadata.get_stream_token) {
            const response = await axios.get('/api/get_stream/generate_token');
            if (response.data) {
              const token = response.data.token;
              const client = new FeedsClient(process.env.NEXT_PUBLIC_GETSTREAM_API_KEY!);
              await client.connectUser(
                {
                  id: user.id,
                  custom: {
                    full_name: user.user_metadata.full_name,
                  },
                  // Optional data
                  name: user.user_metadata.username,
                  image: user.user_metadata.avatar_url,
                },
                token,
              );
              setClient(client);
            }
          } else {
            const client = new FeedsClient(process.env.NEXT_PUBLIC_GETSTREAM_API_KEY!);
            await client.connectUser(
              { id: user.id },
              user.user_metadata.get_stream_token,
            );
            setClient(client);
          }
        } catch (error: any) {
          if (error?.toString()?.includes('token is expired')) {
            // token expired, generate new token
            const response = await axios.get('/api/get_stream/generate_token');
            if (response.data) {
              const token = response.data.token;
              const client = new FeedsClient(process.env.NEXT_PUBLIC_GETSTREAM_API_KEY!);
              await client.connectUser(
                { id: user.id },
                token,
              );
              setClient(client);
            }
          } else {
            throw error;
          }
        }
        setUser(user);
      } catch (error) {
        console.error(error);
        setUser(null);
        redirect('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    client,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>
    {loading && (
      <div className="absolute z-50 inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    )}
    {!loading && !user && <></>}
    {!loading && user && children}
  </AuthContext.Provider>;
};
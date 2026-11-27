import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  createConversation,
  listConversations,
  readLanguage,
  removeConversation,
  saveLanguage,
} from "@/lib/history.functions";
import { languageSchema, messageSchema, type FarmThread, type Language } from "@/lib/agri-shared";
import { z } from "zod";
import { toast } from "sonner";
type AppState = {
  user: User | null;
  ready: boolean;
  threads: FarmThread[];
  loading: boolean;
  historyError: string | null;
  language: Language;
  setLanguage: (v: Language) => void;
  newThread: () => Promise<string>;
  deleteThread: (id: string) => Promise<void>;
  updateThread: (thread: FarmThread) => void;
  refresh: () => void;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
};
const AppContext = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<Language>("English");
  const [guests, setGuests] = useState<FarmThread[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const remove = useServerFn(removeConversation);
  const getLanguage = useServerFn(readLanguage);
  const savePreference = useServerFn(saveLanguage);
  const queryClient = useQueryClient();
  useEffect(() => {
    let alive = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (alive) {
          setUser(data.user);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setUser(session?.user ?? null);
        setReady(true);
        setAuthOpen(false);
        queryClient.removeQueries({ queryKey: ["farmer-history"] });
        queryClient.removeQueries({ queryKey: ["farmer-language"] });
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);
  const history = useQuery({
    queryKey: ["farmer-history", user?.id],
    enabled: ready && Boolean(user),
    queryFn: async () => {
      const rows = await list();
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        updated_at: row.updated_at,
        messages: z.array(messageSchema).parse(row.messages),
      }));
    },
  });
  const preference = useQuery({
    queryKey: ["farmer-language", user?.id],
    enabled: ready && Boolean(user),
    queryFn: () => getLanguage(),
  });
  useEffect(() => {
    if (preference.data) {
      const value = languageSchema.safeParse(preference.data);
      if (value.success) setLanguageState(value.data);
    }
  }, [preference.data]);
  const setLanguage = useCallback(
    (value: Language) => {
      setLanguageState(value);
      if (user)
        void savePreference({ data: { language: value } }).catch(() =>
          toast.error("Your language could not be saved. Please try again."),
        );
    },
    [user, savePreference],
  );
  const refresh = useCallback(() => {
    if (user) void queryClient.invalidateQueries({ queryKey: ["farmer-history", user.id] });
  }, [user, queryClient]);
  const newThread = async () => {
    const id = crypto.randomUUID();
    const thread: FarmThread = {
      id,
      title: "New farming question",
      messages: [],
      updated_at: new Date().toISOString(),
    };
    if (user) {
      await create({ data: { id } });
      queryClient.setQueryData<FarmThread[]>(["farmer-history", user.id], (old) => [
        thread,
        ...(old ?? []),
      ]);
    } else setGuests((old) => [thread, ...old]);
    return id;
  };
  const deleteThread = async (id: string) => {
    if (user) {
      await remove({ data: { id } });
      queryClient.setQueryData<FarmThread[]>(["farmer-history", user.id], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
    } else setGuests((old) => old.filter((t) => t.id !== id));
  };
  const updateThread = (thread: FarmThread) => {
    const replace = (old: FarmThread[]) => [thread, ...old.filter((t) => t.id !== thread.id)];
    if (user)
      queryClient.setQueryData<FarmThread[]>(["farmer-history", user.id], (old) =>
        replace(old ?? []),
      );
    else setGuests(replace);
  };
  return (
    <AppContext.Provider
      value={{
        user,
        ready,
        threads: user ? (history.data ?? []) : guests,
        loading: !ready || Boolean(user && history.isPending),
        historyError: history.error?.message ?? null,
        language,
        setLanguage,
        newThread,
        deleteThread,
        updateThread,
        refresh,
        authOpen,
        setAuthOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useAgri() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AgriCare provider is missing");
  return value;
}

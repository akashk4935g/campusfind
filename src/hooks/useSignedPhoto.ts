import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Photos live in a private bucket, so they are rendered through short-lived
 * signed URLs that only signed-in students can mint.
 */
export function useSignedPhoto(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }

    supabase.storage
      .from("item-photos")
      .createSignedUrl(path, 60 * 30)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });

    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export async function uploadItemPhoto(file: File, userId: string): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("item-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

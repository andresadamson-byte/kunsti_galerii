type ServerFnArgs<T> = { data: T };

async function callAdmin<TInput, TOutput = unknown>(action: string, data: TInput): Promise<TOutput> {
  const res = await fetch("/.netlify/functions/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error(payload?.error || `Päring ebaõnnestus (${res.status})`);
  }

  return payload as TOutput;
}

export function verifyPassword({ data }: ServerFnArgs<{ password: string }>) {
  return callAdmin<{ password: string }, { ok: true }>("verifyPassword", data);
}

export function changePassword({ data }: ServerFnArgs<{ oldPassword: string; newPassword: string }>) {
  return callAdmin<typeof data, { ok: true }>("changePassword", data);
}

export function saveArtwork({ data }: ServerFnArgs<{ password: string; artwork: unknown }>) {
  return callAdmin<typeof data, { id: string }>("saveArtwork", data);
}

export function deleteArtwork({ data }: ServerFnArgs<{ password: string; id: string }>) {
  return callAdmin<typeof data, { ok: true }>("deleteArtwork", data);
}

export function reorderArtworks({ data }: ServerFnArgs<{ password: string; orders: { id: string; sort_order: number }[] }>) {
  return callAdmin<typeof data, { ok: true }>("reorderArtworks", data);
}

export function saveCategory({ data }: ServerFnArgs<{ password: string; category: unknown }>) {
  return callAdmin<typeof data, { id: string }>("saveCategory", data);
}

export function deleteCategory({ data }: ServerFnArgs<{ password: string; id: string }>) {
  return callAdmin<typeof data, { ok: true }>("deleteCategory", data);
}

export function uploadImage({ data }: ServerFnArgs<{ password: string; filename: string; dataBase64: string; contentType: string }>) {
  return callAdmin<typeof data, { path: string }>("uploadImage", data);
}

export function savePage({ data }: ServerFnArgs<{ password: string; page: unknown }>) {
  return callAdmin<typeof data, { id: string }>("savePage", data);
}

export function deletePage({ data }: ServerFnArgs<{ password: string; id: string }>) {
  return callAdmin<typeof data, { ok: true }>("deletePage", data);
}

export function saveLesson({ data }: ServerFnArgs<{ password: string; lesson: unknown }>) {
  return callAdmin<typeof data, { id: string }>("saveLesson", data);
}

export function deleteLesson({ data }: ServerFnArgs<{ password: string; id: string }>) {
  return callAdmin<typeof data, { ok: true }>("deleteLesson", data);
}

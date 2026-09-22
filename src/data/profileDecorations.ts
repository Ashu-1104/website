export type ProfileDecorationKind = 'avatar' | 'background';

export type ProfileDecorationItem = {
  id: string;
  kind: ProfileDecorationKind;
  imageUrl: string;
};

function uniqueUrls(urls: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    const normalized = url.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export const profileBackgroundDecorations: ReadonlyArray<ProfileDecorationItem> = uniqueUrls([
  'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/556332d2-0063-4fb7-884d-8fca2886b73e/transcode=true,original=true/556332d2-0063-4fb7-884d-8fca2886b73e.mp4',
  'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/696be3b3-0a39-4735-93c8-1eada74913cb/transcode=true,original=true/696be3b3-0a39-4735-93c8-1eada74913cb.mp4',
  'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d1d7f6e5-5c49-4963-bd52-0a65c4ace400/transcode=true,original=true/d1d7f6e5-5c49-4963-bd52-0a65c4ace400.mp4',
]).map((imageUrl, index) => ({
  id: `bg-${index}`,
  kind: 'background',
  imageUrl,
}));

export const avatarDecorations: ReadonlyArray<ProfileDecorationItem> = uniqueUrls([
  'https://image.cdn2.seaart.me/static/upload/20250908/bf893fe5-910e-4af1-9fa4-4b13e95109e9.webp',
  'https://image.cdn2.seaart.me/static/upload/20250908/18fc2b8c-c7be-4a1a-b614-fa2cb40ce5e6.webp',
  'https://image.cdn2.seaart.me/static/upload/20251202/ff3ec843-2eb2-4493-8d2b-b739848d558f.webp',
  'https://image.cdn2.seaart.me/static/upload/20251229/77be0873-7195-409f-babb-f6ba6f8a8e52.webp',
  'https://image.cdn2.seaart.me/static/upload/20251210/07a58b46-9e1c-4d7a-bfce-57527ba69356.webp',
  'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/858bece3-3a7c-4f61-a4ab-5fc2eabae58c/original=true/858bece3-3a7c-4f61-a4ab-5fc2eabae58c.jpeg',
  'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/f5a420bc-d283-44a6-860a-9fc130668c0e/original=true/user%20avatar%20decoration.jpeg',
  'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/9fbaa8bc-b89b-4a57-b051-21a91151d156/width=96,original=false,optimized=true/user%20avatar%20decoration.jpeg',
]).map((imageUrl, index) => ({
  id: `avatar-${index}`,
  kind: 'avatar',
  imageUrl,
}));


// app/src/ui/RemoteImage.js
// Drop-in for react-native <Image> on remote pictures, on expo-image:
//   • memory + disk cache (cachePolicy "memory-disk"): seen once, instant afterwards, also offline
//   • a light grey placeholder until it loads, then a 200 ms fade
//   • size="logo" | "avatar" | "card" | "banner" | <px>: Cloudinary sends that width,
//     WebP/AVIF and auto quality (utils/imageUrl sizedImageUrl); other URLs unchanged
// Takes the react-native props used in the app: source ({ uri } or require()), style,
// resizeMode, onError, onLoad, onLoadStart, onLoadEnd, blurRadius, testID, accessibility props.
import React from "react";
import { Image } from "expo-image";
import { sizedImageUrl } from "../utils/imageUrl";

// flat #EEEEEE (1x1 blurhash): shown only until the picture loads, never behind it
const PLACEHOLDER = { blurhash: "00RW0b" };

const FIT = { cover: "cover", contain: "contain", stretch: "fill", center: "scale-down", repeat: "cover" };

export function remoteSource(source, size) {
  if (!source || typeof source !== "object" || Array.isArray(source) || !source.uri) return source;
  const uri = sizedImageUrl(source.uri, size);
  return uri === source.uri ? source : { ...source, uri };
}

export default function RemoteImage({
  source,
  size,
  resizeMode,
  contentFit,
  placeholder = PLACEHOLDER,
  transition = 200,
  cachePolicy = "memory-disk",
  fadeDuration, // react-native only (expo-image fades with `transition`)
  loading, // react-native web only
  ...rest
}) {
  return (
    <Image
      {...rest}
      source={remoteSource(source, size)}
      contentFit={contentFit || FIT[resizeMode] || "cover"}
      placeholder={placeholder}
      placeholderContentFit="cover"
      transition={transition}
      cachePolicy={cachePolicy}
    />
  );
}

// Warm the same cache ahead of time (e.g. the next screen's pictures)
export const prefetchRemoteImages = (urls, size) =>
  Image.prefetch((Array.isArray(urls) ? urls : [urls]).filter(Boolean).map((u) => sizedImageUrl(u, size)), "memory-disk").catch(() => false);

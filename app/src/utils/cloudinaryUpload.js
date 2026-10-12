// app/src/utils/cloudinaryUpload.js
// Receipt / screenshot upload to Cloudinary (same unsigned preset and cloud the Payment
// screen has always used), plus the gallery picker with its permission prompt.
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

const CLOUD = "decaxpera";
const PRESET = "tdc_profiles";

// Ask for gallery access and pick one image. Resolves the local uri, or null.
export async function pickImageFromLibrary({ aspect = [4, 3] } = {}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission Required", "Please allow gallery access to upload your receipt.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    aspect,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

// Upload a local image; resolves the https secure_url. Throws an Error with a plain message.
export async function uploadImageToCloudinary(uri, { timeoutMs = 45000 } = {}) {
  const data = new FormData();
  const filename = String(uri).split("/").pop() || "receipt.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image";
  data.append("file", { uri, name: filename, type });
  data.append("upload_preset", PRESET);

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: "POST",
      body: data,
      signal: controller?.signal,
    });
  } catch {
    throw new Error("the screenshot didn't upload. check your connection and try again.");
  } finally {
    if (timer) clearTimeout(timer);
  }
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok || !json.secure_url) throw new Error("the screenshot didn't upload. try again or pick another image.");
  return json.secure_url;
}

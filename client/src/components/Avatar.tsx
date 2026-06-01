import { useState } from "react";
import { avatarGradient, initials, studentPhoto } from "../utils/format";

interface Props {
  id: string;
  name: string;
  /** pixel size, default 44 */
  size?: number;
  className?: string;
  rounded?: string;
}

/**
 * Student avatar: shows a (dummy) photo and falls back to a gradient with
 * the student's initials if the image fails to load.
 */
export function Avatar({
  id,
  name,
  size = 44,
  className = "",
  rounded = "rounded-full",
}: Props) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (failed) {
    return (
      <div
        className={`grid flex-shrink-0 place-items-center font-display font-bold text-white ${rounded} ${className}`}
        // initials scale with the avatar (≈36% of its size) for visual balance
        style={{ ...style, background: avatarGradient(id), fontSize: size * 0.36 }}
        aria-hidden
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={studentPhoto(id, size * 2)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`flex-shrink-0 object-cover ${rounded} ${className}`}
      style={{ ...style, background: avatarGradient(id) }}
    />
  );
}

import debug from "debug";

export type LogType = "Notify" | "Success" | "Error";

export function showLogger(
  log: debug.Debugger,
  type: LogType,
  message: string
) {
  let color = "#FABB51";
  if (type === "Success") {
    color = "#6BCB77";
  } else if (type === "Error") {
    color = "#FF6B6B";
  }
  log(`%c${message} \n\n`, `color: ${color};`);
}

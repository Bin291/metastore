"use client";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label = "Duration" }: TimePickerProps) {
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hours: 0, minutes: 0, seconds: 0 };
    const [hoursStr = "0", minutesStr = "0", secondsStr = "0"] = timeStr.split(":");
    return {
      hours: parseInt(hoursStr) || 0,
      minutes: parseInt(minutesStr) || 0,
      seconds: parseInt(secondsStr) || 0,
    };
  };

  const timeObj = parseTime(value);

  const handleChange = (field: "hours" | "minutes" | "seconds", val: number) => {
    const newObj = { ...timeObj, [field]: Math.max(0, val) };
    const formatted = `${newObj.hours.toString().padStart(2, "0")}:${newObj.minutes
      .toString()
      .padStart(2, "0")}:${newObj.seconds.toString().padStart(2, "0")}`;
    onChange(formatted);
  };

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            min="0"
            max="23"
            value={timeObj.hours}
            onChange={(e) => handleChange("hours", parseInt(e.target.value))}
            placeholder="00"
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 text-center"
          />
          <p className="text-xs text-zinc-500 text-center mt-1">Hours</p>
        </div>
        <div className="flex-1">
          <input
            type="number"
            min="0"
            max="59"
            value={timeObj.minutes}
            onChange={(e) => handleChange("minutes", parseInt(e.target.value))}
            placeholder="00"
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 text-center"
          />
          <p className="text-xs text-zinc-500 text-center mt-1">Minutes</p>
        </div>
        <div className="flex-1">
          <input
            type="number"
            min="0"
            max="59"
            value={timeObj.seconds}
            onChange={(e) => handleChange("seconds", parseInt(e.target.value))}
            placeholder="00"
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 text-center"
          />
          <p className="text-xs text-zinc-500 text-center mt-1">Seconds</p>
        </div>
      </div>
    </label>
  );
}

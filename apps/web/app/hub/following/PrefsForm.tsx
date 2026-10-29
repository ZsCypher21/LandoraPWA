"use client";

import { useState, useTransition } from "react";
import { CHANNELS, NOTIFY_TOPICS, type Channel, type NotifyPrefs, type NotifyTopic } from "@/lib/social";
import { setPrefAction } from "../actions";

/** Per topic, per channel (SOC-C2). Push is a preference only in the preview: nothing is sent. */
export function PrefsForm({ initial }: { initial: NotifyPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const topics = Object.keys(NOTIFY_TOPICS) as NotifyTopic[];
  const channels = Object.keys(CHANNELS) as Channel[];

  function toggle(topic: NotifyTopic, channel: Channel) {
    const on = !prefs[topic][channel];
    setPrefs((p) => ({ ...p, [topic]: { ...p[topic], [channel]: on } }));
    start(async () => {
      const r = await setPrefAction(topic, channel, on);
      if (!r.ok) {
        setError(r.error);
        setPrefs((p) => ({ ...p, [topic]: { ...p[topic], [channel]: !on } }));
      } else setError(null);
    });
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[30rem] text-left text-sm">
        <caption className="sr-only">Notification preferences</caption>
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Notify me about
            </th>
            {channels.map((c) => (
              <th key={c} scope="col" className="px-3 py-3 text-center font-semibold">
                {CHANNELS[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {topics.map((t) => (
            <tr key={t}>
              <th scope="row" className="px-4 py-3 font-normal">
                <span className="block font-semibold">{NOTIFY_TOPICS[t].label}</span>
                <span className="block text-xs text-muted">{NOTIFY_TOPICS[t].detail}</span>
              </th>
              {channels.map((c) => (
                <td key={c} className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={prefs[t][c]}
                    disabled={pending}
                    onChange={() => toggle(t, c)}
                    aria-label={`${NOTIFY_TOPICS[t].label}: ${CHANNELS[c]}`}
                    className="h-5 w-5 accent-brand-600"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p role="status" className="px-4 pb-3 text-xs text-bad-700">
        {error}
      </p>
    </div>
  );
}

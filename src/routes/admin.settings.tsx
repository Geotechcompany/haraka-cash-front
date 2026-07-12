import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuoteAiProvider } from "@/lib/models/settings";
import { getAdminPlatformSettings, updateAdminPlatformSettings } from "@/server/settings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  loader: () => getAdminPlatformSettings(),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const initialSettings = Route.useLoaderData();
  const updateSettings = useServerFn(updateAdminPlatformSettings);
  const [settings, setSettings] = useState(initialSettings);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(
    initialSettings.geminiApiKeyMasked || "",
  );
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState(
    initialSettings.openaiApiKeyMasked || "",
  );
  const [nvidiaApiKeyInput, setNvidiaApiKeyInput] = useState(
    initialSettings.nvidiaApiKeyMasked || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const setNumber = (
    key:
      | "minLoanAmount"
      | "maxLoanAmount"
      | "minProcessingFee"
      | "monthlyInterestRate"
      | "lateFeeRate",
    value: string,
  ) => {
    setSettings((current) => ({ ...current, [key]: Number(value) }));
  };

  const setToggle = (
    key: "automatedApprovals" | "fraudChecks" | "smsNotifications" | "maintenanceMode",
    checked: boolean,
  ) => {
    setSettings((current) => ({ ...current, [key]: checked }));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const geminiChanged = geminiApiKeyInput !== (settings.geminiApiKeyMasked || "");
      const openaiChanged = openaiApiKeyInput !== (settings.openaiApiKeyMasked || "");
      const nvidiaChanged = nvidiaApiKeyInput !== (settings.nvidiaApiKeyMasked || "");
      const updated = await updateSettings({
        data: {
          minLoanAmount: settings.minLoanAmount,
          maxLoanAmount: settings.maxLoanAmount,
          minProcessingFee: settings.minProcessingFee,
          monthlyInterestRate: settings.monthlyInterestRate,
          lateFeeRate: settings.lateFeeRate,
          automatedApprovals: settings.automatedApprovals,
          fraudChecks: settings.fraudChecks,
          smsNotifications: settings.smsNotifications,
          maintenanceMode: settings.maintenanceMode,
          quoteAiProvider: settings.quoteAiProvider,
          ...(geminiChanged ? { geminiApiKey: geminiApiKeyInput } : {}),
          ...(openaiChanged ? { openaiApiKey: openaiApiKeyInput } : {}),
          ...(nvidiaChanged ? { nvidiaApiKey: nvidiaApiKeyInput } : {}),
        },
      });
      setSettings(updated);
      setGeminiApiKeyInput(updated.geminiApiKeyMasked || "");
      setOpenaiApiKeyInput(updated.openaiApiKeyMasked || "");
      setNvidiaApiKeyInput(updated.nvidiaApiKeyMasked || "");
      toast.success("Platform settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggles = [
    {
      key: "automatedApprovals" as const,
      title: "Automated approvals",
      description: "Auto-approve eligible low-risk applications.",
    },
    {
      key: "fraudChecks" as const,
      title: "Fraud checks",
      description: "Enable enhanced fraud screening for new users.",
    },
    {
      key: "smsNotifications" as const,
      title: "SMS notifications",
      description: "Send SMS updates to borrowers.",
    },
    {
      key: "maintenanceMode" as const,
      title: "Maintenance mode",
      description: "Temporarily disable new applications.",
    },
  ];

  return (
    <AdminShell title="Settings" subtitle="Platform-level configuration.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-soft p-6">
          <p className="font-semibold">Lending policy</p>
          <p className="text-xs text-muted-foreground">
            Minimum loan amount and processing fee apply to every applicant.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Min loan amount (KES)"
              value={settings.minLoanAmount}
              onChange={(event) => setNumber("minLoanAmount", event.target.value)}
            />
            <Field
              label="Max loan amount (KES)"
              value={settings.maxLoanAmount}
              onChange={(event) => setNumber("maxLoanAmount", event.target.value)}
            />
            <Field
              label="Min processing fee (KES)"
              value={settings.minProcessingFee}
              onChange={(event) => setNumber("minProcessingFee", event.target.value)}
            />
            <Field
              label="Monthly interest %"
              value={settings.monthlyInterestRate}
              onChange={(event) => setNumber("monthlyInterestRate", event.target.value)}
            />
            <Field
              label="Late fee %"
              value={settings.lateFeeRate}
              onChange={(event) => setNumber("lateFeeRate", event.target.value)}
            />
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quote-ai-provider">Quote AI provider</Label>
              <Select
                value={settings.quoteAiProvider}
                onValueChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    quoteAiProvider: value as QuoteAiProvider,
                  }))
                }
              >
                <SelectTrigger id="quote-ai-provider" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Gemini → OpenAI → NVIDIA)</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="nvidia">NVIDIA</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Money math stays local. AI only adds notes and risk band. Auto tries Gemini, then
                OpenAI, then NVIDIA. Missing keys skip to the next provider, then local-only.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gemini-api-key">Gemini API key</Label>
              <Input
                id="gemini-api-key"
                type="password"
                autoComplete="off"
                className="h-11 rounded-xl font-mono text-sm"
                value={geminiApiKeyInput}
                placeholder="Paste key, or leave blank to use env"
                onChange={(event) => setGeminiApiKeyInput(event.target.value)}
                onFocus={() => {
                  if (geminiApiKeyInput.startsWith("••••")) {
                    setGeminiApiKeyInput("");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {settings.geminiApiKeyConfigured
                  ? "Key is saved. Focus the field to replace it, or clear and save to fall back to env."
                  : "No admin key saved. Uses GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY if set."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="openai-api-key">OpenAI API key</Label>
              <Input
                id="openai-api-key"
                type="password"
                autoComplete="off"
                className="h-11 rounded-xl font-mono text-sm"
                value={openaiApiKeyInput}
                placeholder="Paste key, or leave blank to use env"
                onChange={(event) => setOpenaiApiKeyInput(event.target.value)}
                onFocus={() => {
                  if (openaiApiKeyInput.startsWith("••••")) {
                    setOpenaiApiKeyInput("");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {settings.openaiApiKeyConfigured
                  ? "Key is saved. Focus the field to replace it, or clear and save to fall back to env."
                  : "No admin key saved. Uses OPENAI_API_KEY if set."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nvidia-api-key">NVIDIA API key</Label>
              <Input
                id="nvidia-api-key"
                type="password"
                autoComplete="off"
                className="h-11 rounded-xl font-mono text-sm"
                value={nvidiaApiKeyInput}
                placeholder="Paste key, or leave blank to use env"
                onChange={(event) => setNvidiaApiKeyInput(event.target.value)}
                onFocus={() => {
                  if (nvidiaApiKeyInput.startsWith("••••")) {
                    setNvidiaApiKeyInput("");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {settings.nvidiaApiKeyConfigured
                  ? "Key is saved. Focus the field to replace it, or clear and save to fall back to env."
                  : "No admin key saved. Uses NVIDIA_API_KEY if set (NIM OpenAI-compatible)."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            disabled={isSaving}
            onClick={save}
            className="mt-4 rounded-xl gradient-brand text-white"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
        <div className="card-soft divide-y">
          {toggles.map((toggle) => (
            <div key={toggle.key} className="p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{toggle.title}</p>
                <p className="text-xs text-muted-foreground">{toggle.description}</p>
              </div>
              <Switch
                checked={settings[toggle.key]}
                onCheckedChange={(checked) => setToggle(toggle.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} className="h-11 rounded-xl" {...rest} />
    </div>
  );
}

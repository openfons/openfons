import type {
  MaskedResolvedPluginRuntime,
  MaskedSecretValue,
  PluginInstance,
  SecretRef
} from '@openfons/contracts';
import { resolveSecretValue, secretRefToSummary } from './secret-store.js';

export const maskSecretRef = (
  ref: SecretRef,
  configured: boolean
): MaskedSecretValue => ({
  valueSource: 'secret',
  configured,
  resolved: configured,
  summary: secretRefToSummary(ref)
});

export const buildMaskedPluginInstanceView = ({
  plugin,
  secretRoot
}: {
  plugin: PluginInstance;
  secretRoot: string;
}): MaskedResolvedPluginRuntime => ({
  pluginId: plugin.id,
  type: plugin.type,
  driver: plugin.driver,
  config: plugin.config,
  secrets: Object.fromEntries(
    Object.entries(plugin.secrets).map(([field, ref]) => [
      field,
      maskSecretRef(ref, resolveSecretValue({ secretRoot, ref }).configured)
    ])
  )
});

import { useForm } from '@/hooks/use-form';
import { getTrpcError } from '@sharkord/shared';
import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { useSettingsFormSlot, type TSettingsFormHandle } from './context';
import { discardDraft, hasUnsavedChanges } from './helpers';

type TUseSettingsFormOptions<T> = {
  initialValues: T;
  onSave: (values: T) => Promise<void>;
  successMessage: string;
  errorMessage: string;
};

const useSettingsForm = <T extends Record<string, unknown>>({
  initialValues,
  onSave,
  successMessage,
  errorMessage
}: TUseSettingsFormOptions<T>) => {
  const form = useForm<T>(initialValues);
  const { values, setValues, setErrors, setTrpcErrors } = form;
  const [baseline, setBaseline] = useState<T>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const { register, unregister } = useSettingsFormSlot();
  const formId = useId();

  const isDirty = hasUnsavedChanges(values, baseline);

  const reset = useCallback(
    (nextValues: T) => {
      setValues(nextValues);
      setBaseline(nextValues);
    },
    [setValues]
  );

  // discard puts the saved values back and drops the errors of a failed save
  const discard = useCallback(() => {
    const next = discardDraft({ values, baseline });

    setValues(next.values);
    setErrors({});
  }, [baseline, setErrors, setValues, values]);

  const save = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      await onSave(values);
      setBaseline(values);
      toast.success(successMessage);
    } catch (error) {
      setTrpcErrors(error);
      toast.error(getTrpcError(error, errorMessage));
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSave, values, setTrpcErrors, successMessage, errorMessage]);

  useEffect(() => {
    const handle: TSettingsFormHandle = { isDirty, isSaving, save, discard };

    register(formId, handle);

    return () => {
      unregister(formId, handle);
    };
  }, [discard, formId, isDirty, isSaving, register, save, unregister]);

  return { ...form, isDirty, isSaving, save, discard, reset };
};

export { useSettingsForm };

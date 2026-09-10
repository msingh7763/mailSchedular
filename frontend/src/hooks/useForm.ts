import { useState, useCallback } from 'react';

interface FormState {
  [key: string]: any;
}

interface FormErrors {
  [key: string]: string;
}

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  validate?: (values: T) => FormErrors;
}

/**
 * Custom hook for form handling with validation
 */
export function useForm<T extends FormState>({
  initialValues,
  onSubmit,
  validate,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const inputValue =
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      setValues((prev) => ({ ...prev, [name]: inputValue }));
    },
    []
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Validate
      const validationErrors = validate ? validate(values) : {};
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length === 0) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validate, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
  };
}

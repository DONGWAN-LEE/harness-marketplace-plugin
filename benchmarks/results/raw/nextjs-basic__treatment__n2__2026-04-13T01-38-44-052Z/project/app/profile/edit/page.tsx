'use client';

import { useState } from 'react';

interface FormValues {
  name: string;
  email: string;
}

interface FormErrors {
  name?: string;
  email?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name || values.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }
  if (!values.email || !validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  return errors;
}

export default function ProfileEditPage() {
  const [values, setValues] = useState<FormValues>({ name: '', email: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      setSuccess(true);
    }
  }

  return (
    <main>
      <h1>Edit Profile</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">Name</label>
          <br />
          <input
            id="name"
            name="name"
            type="text"
            value={values.name}
            onChange={handleChange}
          />
          {errors.name && <p role="alert">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
          />
          {errors.email && <p role="alert">{errors.email}</p>}
        </div>
        <button type="submit">Save</button>
      </form>
      {success && <p>Profile updated</p>}
    </main>
  );
}

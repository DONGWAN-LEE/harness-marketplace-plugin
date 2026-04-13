'use client';

import { useState } from 'react';

interface FormFields {
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

export default function ProfileEditPage() {
  const [fields, setFields] = useState<FormFields>({ name: '', email: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (fields.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }
    if (!validateEmail(fields.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    return errs;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSuccess(true);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Edit Profile</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name">Name</label>
          <br />
          <input
            id="name"
            name="name"
            type="text"
            value={fields.name}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.4rem', marginTop: '0.25rem' }}
          />
          {errors.name && (
            <p role="alert" style={{ color: 'red', margin: '0.25rem 0 0' }}>
              {errors.name}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.4rem', marginTop: '0.25rem' }}
          />
          {errors.email && (
            <p role="alert" style={{ color: 'red', margin: '0.25rem 0 0' }}>
              {errors.email}
            </p>
          )}
        </div>

        <button type="submit">Save</button>
      </form>

      {success && (
        <p style={{ color: 'green', marginTop: '1rem' }}>Profile updated</p>
      )}
    </main>
  );
}

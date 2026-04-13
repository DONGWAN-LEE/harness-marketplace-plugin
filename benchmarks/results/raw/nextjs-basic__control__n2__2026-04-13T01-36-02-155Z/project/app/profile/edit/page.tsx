'use client';

import { useState, FormEvent } from 'react';

interface FormErrors {
  name?: string;
  email?: string;
}

export default function ProfileEditPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!name || name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    return errs;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSuccess(true);
    }
  }

  return (
    <main>
      <h1>Edit Profile</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p role="alert">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p role="alert">{errors.email}</p>}
        </div>
        <button type="submit">Save</button>
      </form>
      {success && <p>Profile updated</p>}
    </main>
  );
}

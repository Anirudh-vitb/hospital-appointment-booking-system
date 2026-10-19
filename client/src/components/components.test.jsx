import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DoctorCard from './DoctorCard.jsx';
import DoctorSearch from './DoctorSearch.jsx';
import SlotPicker from './SlotPicker.jsx';
import StatusBadge from './StatusBadge.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import Navbar from './Navbar.jsx';
import { renderWithProviders, sampleDoctor } from '../test/utils.jsx';

describe('DoctorCard', () => {
  it('shows the doctor’s key details and a booking link', () => {
    renderWithProviders(<DoctorCard doctor={sampleDoctor} />);
    expect(screen.getByRole('heading', { name: 'Dr. Meera Iyer' })).toBeInTheDocument();
    expect(screen.getByText('₹500')).toBeInTheDocument();
    expect(screen.getByText('MBBS, MD (DVL)')).toBeInTheDocument();
    expect(screen.getByText('Mon, Wed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book an appointment with Dr. Meera Iyer' })).toHaveAttribute('href', '/patient/book/d1');
  });

  it('does not repeat the department when it equals the specialty', () => {
    renderWithProviders(<DoctorCard doctor={sampleDoctor} />);
    expect(screen.getAllByText('Dermatology')).toHaveLength(1);
  });
});

describe('DoctorSearch', () => {
  it('passes the typed query and department to onSearch', async () => {
    const onSearch = vi.fn();
    render(<DoctorSearch departments={[{ id: '1', slug: 'ent', name: 'ENT' }]} onSearch={onSearch} />);
    await userEvent.type(screen.getByRole('searchbox'), '  Priya ');
    await userEvent.selectOptions(screen.getByLabelText('Department'), 'ent');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith({ q: 'Priya', department: 'ent' });
  });
});

describe('SlotPicker', () => {
  const slots = [
    { start: '09:00', end: '09:15', status: 'available' },
    { start: '09:15', end: '09:30', status: 'booked' },
    { start: '16:00', end: '16:15', status: 'blocked' },
  ];

  it('lets the patient pick only available slots', async () => {
    const onSelect = vi.fn();
    render(<SlotPicker slots={slots} selected="" onSelect={onSelect} />);
    expect(screen.getByText('1 of 3 times available')).toBeInTheDocument();
    const booked = screen.getByRole('button', { name: '9:15 am, already booked' });
    expect(booked).toBeDisabled();
    await userEvent.click(booked);
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '9:00 am' }));
    expect(onSelect).toHaveBeenCalledWith('09:00');
  });

  it('groups slots by part of the day and marks the selection', () => {
    render(<SlotPicker slots={slots} selected="09:00" onSelect={() => {}} />);
    expect(screen.getByRole('group', { name: 'Morning' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Evening' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '9:00 am' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('status, loading and error states', () => {
  it('renders patient-friendly status labels', () => {
    render(<StatusBadge status="pending" long />);
    expect(screen.getByText('Awaiting confirmation')).toBeInTheDocument();
  });

  it('shows a loading indicator with a label', () => {
    render(<LoadingSpinner label="Checking free times" />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking free times…');
  });

  it('shows the server message and a retry button', async () => {
    const onRetry = vi.fn();
    render(<ErrorMessage error={new Error('Database unreachable')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Database unreachable');
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('Navbar', () => {
  it('shows sign-in links to visitors', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('shows the role-specific dashboard link and signs out', async () => {
    const logout = vi.fn().mockResolvedValue();
    renderWithProviders(<Navbar />, { user: { name: 'Lakshmi Narayana', email: 'l@x.example', role: 'doctor' }, auth: { logout } });
    expect(screen.getByRole('link', { name: 'Doctor desk' })).toHaveAttribute('href', '/doctor');
    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logout).toHaveBeenCalledOnce();
  });
});

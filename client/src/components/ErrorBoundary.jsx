import { Component } from 'react';

// React only supports error boundaries as class components (there is no
// hook equivalent of componentDidCatch), so this is the one class component
// in the project. It stops a rendering bug in one page from blanking the
// whole application.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unexpected UI error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="page py-16">
          <h1 className="text-2xl">This page stopped working</h1>
          <p className="mt-2 text-ink-soft">An unexpected error occurred while showing this page. Your bookings are not affected.</p>
          <button type="button" className="btn-primary mt-6" onClick={() => window.location.assign('/')}>
            Return to the home page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

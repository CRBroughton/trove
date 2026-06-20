import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('modal', () => {
  it('renders title and message', () => {
    render(
      <Modal
        title="SEND ROM?"
        message="Target already has this ROM."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('SEND ROM?')).toBeInTheDocument()
    expect(screen.getByText('Target already has this ROM.')).toBeInTheDocument()
  })

  it('uses default button labels', () => {
    render(
      <Modal title="T" message="M" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText('CONFIRM')).toBeInTheDocument()
    expect(screen.getByText('CANCEL')).toBeInTheDocument()
  })

  it('uses custom button labels', () => {
    render(
      <Modal
        title="T"
        message="M"
        confirmLabel="SEND ANYWAY"
        cancelLabel="BACK"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('SEND ANYWAY')).toBeInTheDocument()
    expect(screen.getByText('BACK')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <Modal title="T" message="M" onConfirm={onConfirm} onCancel={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('CONFIRM'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(
      <Modal title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when overlay clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <Modal title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.click(container.firstChild as Element)
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not call onCancel when dialog content clicked', () => {
    const onCancel = vi.fn()
    render(
      <Modal title="T" message="MY MESSAGE" onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByText('MY MESSAGE'))
    expect(onCancel).not.toHaveBeenCalled()
  })
})

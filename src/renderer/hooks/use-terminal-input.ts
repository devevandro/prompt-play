import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react'

import { TERMINAL_COMMANDS } from 'renderer/lib/terminal-commands'

export interface TerminalThemePicker {
  activeThemeId: string
  options: readonly {
    id: string
    name: string
  }[]
  selectedIndex: number
  onCancel: () => void
  onMove: (direction: 'next' | 'prev') => void
  onSelect: (index?: number) => void
}

export function useTerminalInput({
  history,
  onArrowNavigation,
  onCommand,
  onCycleTab,
  onVolumeShortcut,
  themePicker,
}: {
  history: string[]
  onArrowNavigation?: (direction: 'down' | 'up') => void
  onCommand: (command: string) => void
  onCycleTab: () => void
  onVolumeShortcut?: (delta: number) => void
  themePicker?: TerminalThemePicker
}) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const focusInput = () => {
    inputRef.current?.focus()
  }

  useEffect(() => {
    focusInput()
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
    focusInput()
  }, [history])

  useEffect(() => {
    if (input.length > 0) {
      const matches = TERMINAL_COMMANDS.filter(command =>
        command.toLowerCase().startsWith(input.toLowerCase())
      )
      setSuggestions(matches)
      setSelectedSuggestion(0)
    } else {
      setSuggestions([])
    }

    setShowSuggestions(false)
  }, [input])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (themePicker && !input.trim()) {
      themePicker.onSelect()
      requestAnimationFrame(focusInput)
      return
    }

    if (input.trim()) {
      onCommand(input.trim())
      setCommandHistory(prev => [...prev, input.trim()])
      setInput('')
      setHistoryIndex(-1)
      setShowSuggestions(false)
      requestAnimationFrame(focusInput)
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      onVolumeShortcut &&
      !input &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      (event.key === '+' || event.key === '=' || event.key === '-')
    ) {
      event.preventDefault()
      onVolumeShortcut(event.key === '-' ? -5 : 5)
      return
    }

    if (event.key === 'Tab' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onCycleTab()
      return
    }

    if (themePicker && !showSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        themePicker.onMove('next')
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        themePicker.onMove('prev')
        return
      }

      if (event.key === 'Enter' && !input.trim()) {
        event.preventDefault()
        themePicker.onSelect()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        themePicker.onCancel()
        return
      }
    }

    if (
      onArrowNavigation &&
      !showSuggestions &&
      (event.key === 'ArrowDown' || event.key === 'ArrowUp')
    ) {
      event.preventDefault()
      onArrowNavigation(event.key === 'ArrowDown' ? 'down' : 'up')
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()

      if (suggestions.length === 1) {
        setInput(suggestions[0])
        setShowSuggestions(false)
      } else if (suggestions.length > 1) {
        if (showSuggestions) {
          setInput(suggestions[selectedSuggestion])
          setShowSuggestions(false)
        } else {
          setShowSuggestions(true)
        }
      }

      return
    }

    if (showSuggestions && suggestions.length > 1) {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setSelectedSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSelectedSuggestion(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        return
      }

      if (event.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setShowSuggestions(false)

      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex < commandHistory.length - 1
            ? historyIndex + 1
            : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setShowSuggestions(false)

      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text')

    if (!pastedText) {
      return
    }

    event.preventDefault()

    const target = event.currentTarget
    const selectionStart = target.selectionStart ?? input.length
    const selectionEnd = target.selectionEnd ?? selectionStart
    const nextInput = `${input.slice(0, selectionStart)}${pastedText}${input.slice(
      selectionEnd
    )}`

    setInput(nextInput)

    requestAnimationFrame(() => {
      target.setSelectionRange(
        selectionStart + pastedText.length,
        selectionStart + pastedText.length
      )
      focusInput()
    })
  }

  const acceptSuggestion = (suggestion: string) => {
    setInput(suggestion)
    setShowSuggestions(false)
    focusInput()
  }

  return {
    acceptSuggestion,
    containerRef,
    focusInput,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    input,
    inputRef,
    selectedSuggestion,
    setInput,
    showSuggestions,
    suggestions,
  }
}

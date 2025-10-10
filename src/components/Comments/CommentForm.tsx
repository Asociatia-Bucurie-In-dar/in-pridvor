'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface CommentFormData {
  name: string
  email: string
  comment: string
  rememberMe: boolean
}

interface CommentFormProps {
  postId: string
  onCommentSubmitted?: () => void
}

const STORAGE_KEY = 'commentUserInfo'

export function CommentForm({ postId, onCommentSubmitted }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CommentFormData>({
    defaultValues: {
      name: '',
      email: '',
      comment: '',
      rememberMe: false,
    },
  })

  const rememberMe = watch('rememberMe')

  // Load saved user info from localStorage on mount
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem(STORAGE_KEY)
      if (savedInfo) {
        const { name, email } = JSON.parse(savedInfo)
        setValue('name', name)
        setValue('email', email)
        setValue('rememberMe', true)
      }
    } catch (error) {
      console.error('Error loading saved user info:', error)
    }
  }, [setValue])

  const onSubmit = async (data: CommentFormData) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      // Save or clear user info based on checkbox
      if (data.rememberMe) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            name: data.name,
            email: data.email,
          }),
        )
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }

      // Submit comment to API
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          comment: data.comment,
          post: postId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit comment')
      }

      setSubmitStatus('success')

      // Reset only the comment field
      setValue('comment', '')

      // Notify parent component
      if (onCommentSubmitted) {
        onCommentSubmitted()
      }

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus('idle')
      }, 5000)
    } catch (error) {
      console.error('Error submitting comment:', error)
      setSubmitStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'An error occurred while submitting your comment',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-8 p-6 bg-card border border-border rounded-lg">
      <h3 className="text-2xl font-semibold mb-4 font-playfair">Lasă un comentariu</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nume *</Label>
            <Input
              id="name"
              type="text"
              {...register('name', {
                required: 'Numele este obligatoriu',
                maxLength: {
                  value: 100,
                  message: 'Numele nu poate depăși 100 de caractere',
                },
              })}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: 'Emailul este obligatoriu',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Adresa de email nu este validă',
                },
              })}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="comment">Comentariu *</Label>
          <Textarea
            id="comment"
            rows={5}
            {...register('comment', {
              required: 'Comentariul este obligatoriu',
              maxLength: {
                value: 1000,
                message: 'Comentariul nu poate depăși 1000 de caractere',
              },
            })}
            className={errors.comment ? 'border-red-500' : ''}
          />
          {errors.comment && <p className="text-red-500 text-sm mt-1">{errors.comment.message}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
          />
          <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
            Salvează numele și emailul meu pentru următorul comentariu
          </Label>
        </div>

        {submitStatus === 'success' && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-green-800 dark:text-green-200">
              Comentariul tău a fost trimis cu succes!
            </p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
          {isSubmitting ? 'Se trimite...' : 'Trimite comentariu'}
        </Button>
      </form>
    </div>
  )
}

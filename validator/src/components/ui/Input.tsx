interface BaseProps {
  label?: string
  hint?: string
  required?: boolean
  className?: string
}

interface InputProps extends BaseProps,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  multiline?: false
}

interface TextareaProps extends BaseProps,
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  multiline: true
}

const fieldClass = `w-full bg-[#0a0a0f] border border-gray-700
  rounded-lg px-4 py-3 text-white text-sm
  focus:border-yellow-400 focus:outline-none
  placeholder:text-gray-600`

export default function Input(props: InputProps | TextareaProps) {
  const { label, hint, required, className = '', ...rest } = props

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-yellow-400 ml-0.5">*</span>}
        </label>
      )}
      {props.multiline ? (
        <textarea
          rows={4}
          className={`${fieldClass} resize-none ${className}`}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={`${fieldClass} ${className}`}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  )
}

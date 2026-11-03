import { Text, TextProps, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

type Weight = 'light' | 'regular' | 'medium' | 'bold' | 'black'
type Variant = 'body' | 'label' | 'caption' | 'title' | 'heading' | 'mono'

interface AppTextProps extends TextProps {
  weight?: Weight
  variant?: Variant
}

const fontMap: Record<Weight, string> = {
  light: 'Roboto_300Light',
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  bold: 'Roboto_700Bold',
  black: 'Roboto_900Black',
}

const sizeMap: Record<Variant, number> = {
  heading: 28,
  title: 22,
  body: 15,
  label: 13,
  caption: 11,
  mono: 13,
}

export function AppText({
  weight = 'regular',
  variant = 'body',
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        {
          fontFamily: variant === 'mono' ? 'RobotoMono_400Regular' : fontMap[weight],
          fontSize: sizeMap[variant],
          color: Colors.dark.text,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  )
}

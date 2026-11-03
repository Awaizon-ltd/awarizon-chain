import Badge from '../ui/Badge'

export default function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <Badge label="● Active" variant="success" />
    : <Badge label="○ Inactive" variant="error" />
}

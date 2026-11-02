import { ICONS } from '../brand/icons'
import { Icon } from '../ui'

/**
 * A forum category's icon. Categories store an icon name in the database, which may not
 * exist in our icon set (e.g. older Material Symbols names): those get the forum glyph.
 */
export default function CategoryIcon({ icon, ...props }) {
  return <Icon name={ICONS[icon] ? icon : 'forum'} {...props} />
}

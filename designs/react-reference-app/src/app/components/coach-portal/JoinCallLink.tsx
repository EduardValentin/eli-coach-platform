import { Link } from 'react-router';
import { buttonVariants } from '../ThemeButton';

const JOIN_LINK_CLASS = buttonVariants({
  variant: 'inverted',
  size: 'xs',
  textSize: 'sm',
  weight: 'semibold',
});

export function JoinCallLink({ joinPath }: { joinPath: string }) {
  return (
    <Link to={joinPath} className={JOIN_LINK_CLASS}>
      Join call
    </Link>
  );
}

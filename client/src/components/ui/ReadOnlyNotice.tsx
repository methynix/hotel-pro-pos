import { FC } from 'react';

const ReadOnlyNotice: FC<{ message?: string }> = ({
  message = 'Read-only access. Ask an administrator if you need to make changes.',
}) => <p className="text-sm text-text-secondary border-l-2 border-secondary-300 pl-3">{message}</p>;

export default ReadOnlyNotice;

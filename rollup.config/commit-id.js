import ucid from 'unique-commit-id';

const latestCommit = ucid.latest(undefined, { abbreviate: true });

export { latestCommit as commitID };

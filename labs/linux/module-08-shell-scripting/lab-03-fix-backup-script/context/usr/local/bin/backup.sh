#bash/bin
SRC_DIR=/var/www/app
BACKUP_DIR=/tmp/backups
if [ ! -d $BACKUP_DIR ]
then
  mkdir $BACKUP_DIR
fi
tar cf /tmp/backups/app-backup.tar $SRC_DIR
echo "Backup complete: $BACKUP_DIR/app-backup.gz"

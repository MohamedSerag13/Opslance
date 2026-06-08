FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN useradd -m -s /bin/bash intern && \
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    echo "intern:intern123" | chpasswd
    
# THE BREAK: Disorient the student
RUN mkdir -p /home/intern/projects/alpha/beta/gamma/
RUN touch /home/intern/projects/alpha/file1.txt /home/intern/projects/alpha/beta/file2.txt
RUN echo "These are some notes" > /home/intern/projects/notes.txt

RUN echo "🎯 Mission: You Found It!\n\nYou navigated to your home directory successfully.\n\nNow complete these tasks:\n1. Create a file called 'found.txt' in this directory (/home/intern/)\n   with the text: \"I navigated the Linux filesystem\"\n\n2. Use 'ls' to list the contents of /etc and count how many items are there.\n   Write the count to /home/intern/etc-count.txt like this:\n   echo \"42 items\" > /home/intern/etc-count.txt\n   (replace 42 with the real count)\n\n3. Navigate to /home/intern/projects/alpha/beta/gamma/ using a RELATIVE path\n   from /home/intern/ (not an absolute path) and create a file called\n   'visited.txt' there.\n\nClick the Check button on the left panel when done." > /home/intern/mission.txt

COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-lost-in-the-filesystem" > /root/flag.txt
USER intern
WORKDIR /usr/share/doc/bash/
ENTRYPOINT ["tail", "-f", "/dev/null"]
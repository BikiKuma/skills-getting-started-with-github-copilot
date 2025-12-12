document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        // store activity name and max participants for later updates
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5 class="participants-count">Participants (${details.participants.length})</h5>
          </div>
        `;

        // Build participants list with delete buttons
        const participantsSection = activityCard.querySelector('.participants-section');
        if (details.participants.length > 0) {
          const ul = document.createElement('ul');

          details.participants.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.textContent = p;

            const btn = document.createElement('button');
            btn.className = 'delete-participant';
            btn.title = 'Unregister';
            btn.innerHTML = '🗑';

            btn.addEventListener('click', async () => {
              try {
                const response = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: 'DELETE' }
                );

                const result = await response.json();

                if (response.ok) {
                  // update local details and UI
                  details.participants = details.participants.filter(x => x !== p);
                  ul.removeChild(li);

                  const countElem = activityCard.querySelector('.participants-count');
                  const availabilityElem = activityCard.querySelector('.availability');
                  const newCount = details.participants.length;
                  countElem.textContent = `Participants (${newCount})`;
                  const newSpotsLeft = details.max_participants - newCount;
                  availabilityElem.innerHTML = `<strong>Availability:</strong> ${newSpotsLeft} spots left`;

                  messageDiv.textContent = result.message;
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                } else {
                  messageDiv.textContent = result.detail || 'Failed to unregister';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
              } catch (error) {
                messageDiv.textContent = 'Failed to unregister. Please try again.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                console.error('Error unregistering:', error);
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });

          participantsSection.appendChild(ul);
        } else {
          const p = document.createElement('p');
          p.className = 'no-participants';
          p.textContent = 'No participants yet';
          participantsSection.appendChild(p);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Update UI immediately: add participant to the corresponding activity card
        const cards = document.querySelectorAll('.activity-card');
        let targetCard = null;
        cards.forEach(c => { if (c.dataset.activityName === activity) targetCard = c; });
        if (targetCard) {
          const participantsSection = targetCard.querySelector('.participants-section');
          let ul = participantsSection.querySelector('ul');
          if (!ul) {
            const nop = participantsSection.querySelector('.no-participants');
            if (nop) nop.remove();
            ul = document.createElement('ul');
            participantsSection.appendChild(ul);
          }

          const li = document.createElement('li');
          li.className = 'participant-item';

          const span = document.createElement('span');
          span.textContent = email;

          const btn = document.createElement('button');
          btn.className = 'delete-participant';
          btn.title = 'Unregister';
          btn.innerHTML = '🗑';

          btn.addEventListener('click', async () => {
            try {
              const res = await fetch(
                `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );
              const resJson = await res.json();
              if (res.ok) {
                ul.removeChild(li);
                const countElem = targetCard.querySelector('.participants-count');
                const prev = parseInt((countElem.textContent.match(/\d+/) || [0])[0], 10);
                const newCount = Math.max(0, prev - 1);
                countElem.textContent = `Participants (${newCount})`;
                const max = parseInt(targetCard.dataset.maxParticipants, 10) || 0;
                const availabilityElem = targetCard.querySelector('.availability');
                availabilityElem.innerHTML = `<strong>Availability:</strong> ${max - newCount} spots left`;
                messageDiv.textContent = resJson.message;
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              } else {
                messageDiv.textContent = resJson.detail || 'Failed to unregister';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            } catch (err) {
              messageDiv.textContent = 'Failed to unregister. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              console.error('Error unregistering:', err);
            }
          });

          li.appendChild(span);
          li.appendChild(btn);
          ul.appendChild(li);

          // Update counts and availability
          const countElem = targetCard.querySelector('.participants-count');
          const prev = parseInt((countElem.textContent.match(/\d+/) || [0])[0], 10);
          const newCount = prev + 1;
          countElem.textContent = `Participants (${newCount})`;
          const max = parseInt(targetCard.dataset.maxParticipants, 10) || 0;
          const availabilityElem = targetCard.querySelector('.availability');
          availabilityElem.innerHTML = `<strong>Availability:</strong> ${max - newCount} spots left`;
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

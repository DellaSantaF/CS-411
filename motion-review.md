# Treadmill motion review

Status: revised treadmill motion and presentation approved by the designer. The complete working activity and subsequent interface revisions have also been approved; see [integration handoff](./integration-notes.md). This document retains the early motion milestone and its physical simplifications.

Open [the demonstration](./prototype/treadmill.html) directly in a browser. It needs no installation or server. Confirm the descriptions beside the ball and treadmill, drop the ball, submit a prediction, and select **Reveal what happens**. After the reveal, change belt settings and use the single **Run again** button.

This archived standalone preview documents the early motion milestone. The complete development activity is now available through the local application; see [README.md](./README.md). No live evaluator or tutor model is connected. The standalone preview accepts nonempty text predictions locally; the current application records one of three direction buttons, without evaluation. Subsequent working-activity feedback also adds one faint previous-run path and apex shadow to the application for comparison; the archived preview still replaces the path entirely. The numerical model below is unchanged.

## Motion and coordinate convention

The scene is a side view. World x increases right, y increases upward, and positive angular velocity is counterclockwise as viewed on screen. Gravity acts downward. Still ambient air is assumed.

Rightward belt travel imparts rightward horizontal velocity and counterclockwise spin; leftward travel mirrors both. During ascent, the Magnus force has a horizontal component opposing the belt direction. The force is perpendicular to instantaneous ball velocity, rather than a constant sideways acceleration or a pre-drawn curve. It does not reverse horizontal velocity at contact.

The controller pauses 25 ms of model time after separation. During the reveal, the main ball remains there while the faded ball repeats the drop and contact. At the shared position and time, the faded ball is hidden and the main ball resumes. Repetitions show a complete drop and ascent with no prediction pause. Each run replaces the previous path and stops at the first apex.

## Model choices and exaggerations

| Quantity | Selected value or treatment |
| --- | --- |
| Gravity | 9.81 m/s² |
| Release height | Ball centre 4.5 m above belt |
| Ball | Radius 0.11 m; mass 0.43 kg; uniform solid-sphere moment of inertia |
| Air density | 1.225 kg/m³ |
| Vertical rebound | Restitution 0.92 |
| Belt speeds | 6–10 m/s, default 8 m/s; direct m/s slider in 0.5 m/s steps |
| Contact | Idealized tangential impulse, animated across 25 ms, with at most 4% visual compression |
| Post-contact horizontal velocity | 2/7 of signed belt speed |
| Post-contact angular velocity | 5 vx / (2 R), from solid-sphere impulse balance |
| Illustrative lift coefficient | 0.25 × belt speed / 8; held constant during each flight |
| Aerodynamic magnitude | **12 ×** CL × ½ × rho × speed² × cross-sectional area |
| Aerodynamic direction | Signed unit vector perpendicular to ball velocity, following omega cross velocity |
| Integration | Fourth-order Runge–Kutta, 1/240 s steps; interpolate the first vertical-velocity zero crossing |
| Horizontal display | **2.5×** vertical distance scale; no axis scale is presented as physically uniform |
| Animation | **0.55×** physical time; belt animation shares the ball/replay clock and freezes whenever the simulation is stationary |
| Visible rotation | Rendered belt speed / rendered ball circumference gives revolutions per second; the rim speed matches belt travel on screen |
| Ball drawing | Radius 12 px for visibility; not a measured scale representation |

The contact impulse assumes enough friction to reach no slip at separation. For a solid sphere, angular impulse and horizontal impulse imply omega R = 2.5 vx. Combining this with vx + omega R = belt speed gives vx = 2 belt speed / 7. Neither translational speed nor angular speed is equated to belt speed. The model is an illustration, not a detailed collision solution; finite contact, compression, restitution, and friction are not jointly solved.

Following motion-review feedback, the displayed rotation is now a separate kinematic teaching mapping. The belt drawing moves at 22 SVG units per metre of model belt travel. The ball's drawn radius is 12 SVG units, so its displayed rotation frequency is (belt speed × 22) / (2π × 12) revolutions per model second. Both belt displacement and spin advance at the same 0.55 playback rate. At the default 8 m/s, the belt moves at 96.8 SVG units per real second, and the ball rotates approximately 1.28 times per real second after contact. This matches the rendered rim and belt speeds without claiming that the independently scaled drawing reproduces the physical angular velocity from the impulse model. During contact, visible rotation ramps up with the impulse. The tennis-ball appearance is illustrative; the nominal model parameters have not been recalibrated to a real tennis ball.

Air drag, spin decay, changing empirical lift coefficients, and deformation dynamics are omitted. The coefficient-to-belt-speed relationship is an illustrative mapping, not an experimentally fitted rotation law. The force multiplier is explicitly a teaching exaggeration; it must not be transferred into the exact formula in simulation 2.

The height, restitution, speed range, and display scaling were chosen to keep the contact-to-curvature sequence visible. For the selected baseline inputs, turning off the 12× multiplier does not reverse horizontal travel before the apex. This comparison establishes a difference between these two numerical models; it does not validate the baseline as a real treadmill experiment. The prototype is not calibrated to measurements. A horizontal reversal and crossing of the contact position happen for the amplified settings; crossing is an incidental outcome, not an added task requirement.

## Verification performed

Browser checks covered 41 speeds from 6 to 10 m/s in each direction (82 trajectories, including all permitted slider settings):

- Every run starts with horizontal velocity in the belt direction and later has opposite horizontal velocity before stopping at the apex.
- Left/right runs mirror each other; trajectory samples remain finite and within the fixed viewport.
- The Magnus term is perpendicular to velocity by construction. With drag omitted, the largest numerical drift in specific mechanical energy was below 0.00025 J/kg, including the interpolated apex.
- Repeating the numerical integration at 1/960 s changed the apex position by less than 0.000023 m.

Representative rightward runs, in model coordinates:

| Belt speed (m/s) | Initial horizontal speed (m/s) | Maximum x (m) | Apex x (m) | Apex height (m) |
| --- | --- | --- | --- | --- |
| 6 | 1.714 | 0.214 | -0.257 | 3.923 |
| 8 | 2.286 | 0.277 | -0.422 | 3.976 |
| 10 | 2.857 | 0.334 | -0.630 | 4.014 |

The UI was checked for both scene-anchored setup confirmations, prediction locking and explicit reveal, replay/merge, playback control locks, and repeated runs. Prediction draws focus to the task card with a distinct border and keyboard focus. Primary blue identifies interactive controls; teal identifies activity flow and the current prediction task. These checks assess the prototype's behavior; designer review is still needed to assess whether the visible sequence is suitable for learning.

After the review revisions, browser checks confirmed that confirmations work in either order, belt and ball remain stationary together at prediction and at the apex, and both direction controls are disabled during playback. Frame-by-frame checks in rightward and leftward runs confirmed matching rendered rim and belt travel (within floating-point rounding). At a 390 px viewport, both callouts remain inside the scene, the prediction task scrolls into view when prompted, and the page has no horizontal overflow. The 82-trajectory numerical check was repeated after shortening contact.

## Sources consulted

NASA Glenn's [Ideal Lift of a Spinning Ball](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-lift-of-a-spinning-ball/) supports the perpendicular force direction and explains limitations of ideal models. Its [Lift of a Soccer Ball](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-of-a-soccer-ball/) discusses empirical lift coefficients and reports 0.25 as an illustrative soccer-ball coefficient. Neither source validates the belt-contact parameters, coefficient mapping, or amplified trajectory used here. These notes are implementation documentation, not the future physics reference supplied by the designer.

## Carry-forward decisions

- Approved: restrained academic interface; English; separate formula simulation controls and response fields; four-minute task-wide skip thresholds paused while the tab is hidden; developer-configured Short / Balanced / Extended tutor thinking allowance, initially Balanced.
- Requested flow additions: participant key entry, then pre-test placeholder, treadmill, introduction, formula exploration, then post-test placeholder. Quiz content will be supplied later.
- Participant keys will determine support condition on the server. Each session receives a random ID. Study-data recording is deferred. Key issuance/reuse policy can be settled when entry is implemented; it does not block the motion review.
- Approved at the motion checkpoint: the revised treadmill numerical/display settings and presentation above.
- The working activity, formula display defaults, and instructional presentation have since been accepted. Scientific reference alignment and the operational interpretation of the tutor thinking allowance remain part of the separate AI-integration work. Live AI remains disabled.

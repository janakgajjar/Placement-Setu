package com.placementsetu.placement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "drive_skills")
public class DriveSkill {

    @EmbeddedId
    private DriveSkillId id;
}
